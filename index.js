(function (exports) {
    "use strict";

    const v = vendetta;
    const ReactModule = v?.metro?.common?.React || globalThis.window?.React;
    const React = ReactModule?.default || ReactModule;
    const RN = v?.metro?.common?.ReactNative || globalThis.window?.ReactNative;
    const storage = v?.plugin?.storage || {};
    const restore = [];
    let patched = false;

    const EPOCH = 1420070400000n;

    function notify(message) {
        try {
            v.ui.toasts.showToast(String(message));
        } catch (_) {
            try { v.logger.info(`[FakeServerYear] ${message}`); } catch (_) {}
        }
    }

    function getActiveGuildId() {
        try {
            const store = v.metro.findByProps("getGuildId", "getLastSelectedGuildId");
            const id = store?.getGuildId?.() || store?.getLastSelectedGuildId?.();
            return id ? String(id) : "";
        } catch (_) {
            return "";
        }
    }

    function getGuildId() {
        const configured = String(storage.guildId || "").trim();
        return /^\d{17,20}$/.test(configured) ? configured : getActiveGuildId();
    }

    function guildCreatedAt(id) {
        try {
            if (!/^\d{17,20}$/.test(String(id))) return null;
            return Number((BigInt(id) >> 22n) + EPOCH);
        } catch (_) {
            return null;
        }
    }

    function sameUtcDay(a, b) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return Math.floor(a / 86400000) === Math.floor(b / 86400000);
    }

    function shiftedDate(value) {
        let timestamp;
        try {
            if (value instanceof Date) timestamp = value.getTime();
            else if (typeof value === "number") timestamp = value;
            else if (typeof value === "string") timestamp = new Date(value).getTime();
            else return null;
        } catch (_) {
            return null;
        }

        if (!Number.isFinite(timestamp)) return null;
        const id = getGuildId();
        const created = guildCreatedAt(id);
        if (created == null || !sameUtcDay(timestamp, created)) return null;

        const year = Number(storage.fakeYear);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 2015 || year > currentYear) return null;

        const original = new Date(timestamp);
        const month = original.getUTCMonth();
        const day = original.getUTCDate();
        const hours = original.getUTCHours();
        const minutes = original.getUTCMinutes();
        const seconds = original.getUTCSeconds();
        const milliseconds = original.getUTCMilliseconds();
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        return new Date(Date.UTC(year, month, Math.min(day, lastDay), hours, minutes, seconds, milliseconds));
    }

    function patchMethod(object, key, makeWrapper) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(object, key);
            if (!descriptor || typeof descriptor.value !== "function" || !descriptor.configurable) return;
            const original = descriptor.value;
            Object.defineProperty(object, key, { ...descriptor, value: makeWrapper(original) });
            restore.push(() => Object.defineProperty(object, key, descriptor));
        } catch (_) {}
    }

    function patchGetter(object, key, makeGetter) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(object, key);
            if (!descriptor || typeof descriptor.get !== "function" || !descriptor.configurable) return;
            Object.defineProperty(object, key, { ...descriptor, get: makeGetter(descriptor.get) });
            restore.push(() => Object.defineProperty(object, key, descriptor));
        } catch (_) {}
    }

    function installPatches() {
        if (patched) return;
        patched = true;

        for (const key of ["toLocaleDateString", "toLocaleString", "toDateString", "getFullYear", "getUTCFullYear", "getYear"]) {
            patchMethod(Date.prototype, key, original => function (...args) {
                const replacement = shiftedDate(this);
                return original.apply(replacement || this, args);
            });
        }

        const intl = globalThis.Intl?.DateTimeFormat?.prototype;
        if (intl) {
            patchGetter(intl, "format", originalGetter => function () {
                const originalFormat = originalGetter.call(this);
                return function (value) {
                    const replacement = shiftedDate(value);
                    return originalFormat(replacement || value);
                };
            });

            for (const key of ["formatToParts", "formatRange", "formatRangeToParts"]) {
                patchMethod(intl, key, original => function (...args) {
                    const first = shiftedDate(args[0]);
                    const second = args.length > 1 ? shiftedDate(args[1]) : null;
                    if (first) args[0] = first;
                    if (second) args[1] = second;
                    return original.apply(this, args);
                });
            }
        }
    }

    function uninstallPatches() {
        while (restore.length) {
            try { restore.pop()(); } catch (_) {}
        }
        patched = false;
    }

    function label(text, style = {}) {
        return React.createElement(RN.Text, {
            style: { color: "#DCDDDE", fontSize: 14, marginHorizontal: 16, marginTop: 10, ...style }
        }, text);
    }

    function settings() {
        if (!React || !RN?.ScrollView || !RN?.TextInput || !RN?.Text) {
            return React?.createElement(RN?.Text || "Text", null, "Settings UI is unavailable on this client.");
        }

        const [yearText, setYearText] = React.useState(String(storage.fakeYear || 2018));
        const [guildId, setGuildId] = React.useState(String(storage.guildId || ""));
        const currentYear = new Date().getFullYear();
        const inputStyle = {
            marginHorizontal: 16,
            marginTop: 6,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderRadius: 8,
            backgroundColor: "#242629",
            color: "#FFFFFF",
            fontSize: 15
        };

        return React.createElement(RN.ScrollView, { keyboardShouldPersistTaps: "handled" },
            label("FAKE SERVER CREATION YEAR", { fontSize: 12, fontWeight: "700", color: "#F3A6D2", marginTop: 18 }),
            label("Fake year", { fontWeight: "600" }),
            React.createElement(RN.TextInput, {
                value: yearText,
                onChangeText: value => {
                    setYearText(value);
                    const parsed = Number(value.replace(/[^0-9]/g, ""));
                    if (Number.isInteger(parsed) && parsed >= 2015 && parsed <= currentYear) {
                        storage.fakeYear = parsed;
                    }
                },
                keyboardType: "number-pad",
                placeholder: "2018",
                placeholderTextColor: "#8E9297",
                style: inputStyle
            }),
            label(`Allowed range: 2015–${currentYear}. The month and day are kept.`, { fontSize: 12, color: "#A3A6AA", marginTop: 5 }),
            label("Server ID (optional)", { fontWeight: "600", marginTop: 18 }),
            React.createElement(RN.TextInput, {
                value: guildId,
                onChangeText: value => {
                    const clean = value.replace(/[^0-9]/g, "").slice(0, 20);
                    setGuildId(clean);
                    storage.guildId = clean;
                },
                keyboardType: "number-pad",
                placeholder: "Leave blank to use the currently open server",
                placeholderTextColor: "#8E9297",
                style: inputStyle
            }),
            label("How to use", { fontWeight: "700", marginTop: 20 }),
            label("1. Open the server whose creation year you want to change.\n2. Leave Server ID blank, or paste a server ID above.\n3. Set the fake year.\n4. Open that server's About / Server Info screen again.", { fontSize: 13, color: "#B9BBBE", lineHeight: 20, marginTop: 5 }),
            label("Local display only: this plugin does not edit the server, its ID, or Discord's data. Only date formatting for that server's creation day is changed on this device.", { fontSize: 12, color: "#F0B86C", lineHeight: 18, marginTop: 16, marginBottom: 24 })
        );
    }

    const plugin = {
        settings,
        onLoad() {
            try {
                if (storage.fakeYear == null) storage.fakeYear = 2018;
                if (storage.guildId == null) storage.guildId = "";
                installPatches();
                notify("Fake Server Year loaded — open its settings to choose a year.");
            } catch (error) {
                try { v.logger.error("[FakeServerYear] Failed to load", error); } catch (_) {}
                uninstallPatches();
            }
        },
        onUnload() {
            uninstallPatches();
            notify("Fake Server Year disabled.");
        }
    };

    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = plugin;
    return exports;
})({});
