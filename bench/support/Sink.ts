export type Cell = string | { t: string; cls?: string };

function displayWidth(s: string): number {
    let w = 0;
    for (const ch of s) {
        const c = ch.codePointAt(0)!;
        const wide = c >= 0x1100 && (
            c <= 0x115F
            || c === 0x2329 || c === 0x232A
            || (c >= 0x2E80 && c <= 0xA4CF && c !== 0x303F)
            || (c >= 0xAC00 && c <= 0xD7A3)
            || (c >= 0xF900 && c <= 0xFAFF)
            || (c >= 0xFE30 && c <= 0xFE6F)
            || (c >= 0xFF00 && c <= 0xFF60)
            || (c >= 0xFFE0 && c <= 0xFFE6)
        );
        w += wide ? 2 : 1;
    }
    return w;
}

function padToWidth(s: string, width: number): string {
    return s + " ".repeat(Math.max(0, width - displayWidth(s)));
}

export interface Sink {
    env(text: string): void;

    section(title: string, desc?: string): void;

    table(head: string[], rows: Cell[][]): void;

    note(text: string): void;
}

export function createSink(): Sink {
    if (typeof document === "undefined") {
        const cellText = (c: Cell) => typeof c === "string" ? c : c.t;
        return {
            env: text => console.log(text),
            section: (title, desc) => console.log(`\n== ${title} ==${desc ? `\n   ${desc}` : ""}`),
            table: (head, rows) => {
                const all = [head, ...rows.map(r => r.map(cellText))];
                const widths = head.map((_, i) => Math.max(...all.map(r => displayWidth(r[i]!))));
                for (const [index, row] of all.entries()) {
                    console.log("   " + row.map((c, i) => padToWidth(c, widths[i]!)).join("  "));
                    if (index === 0) console.log("   " + widths.map(w => "-".repeat(w)).join("  "));
                }
            },
            note: text => console.log(`   ${text}`),
        };
    }

    const out = document.getElementById("out")!;
    return {
        env: text => {
            document.getElementById("env")!.textContent = text;
        },
        section: (title, desc) => {
            const h = document.createElement("h2");
            h.textContent = title;
            out.append(h);
            if (desc) {
                const p = document.createElement("p");
                p.className = "note";
                p.textContent = desc;
                out.append(p);
            }
        },
        table: (head, rows) => {
            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const htr = document.createElement("tr");
            for (const h of head) {
                const th = document.createElement("th");
                th.textContent = h;
                htr.append(th);
            }
            thead.append(htr);
            table.append(thead);

            const tbody = document.createElement("tbody");
            for (const row of rows) {
                const tr = document.createElement("tr");
                for (const c of row) {
                    const td = document.createElement("td");
                    td.textContent = typeof c === "string" ? c : c.t;
                    if (typeof c !== "string" && c.cls) td.className = c.cls;
                    tr.append(td);
                }
                tbody.append(tr);
            }
            table.append(tbody);
            out.append(table);
        },
        note: text => {
            const p = document.createElement("p");
            p.className = "note";
            p.textContent = text;
            out.append(p);
        },
    };
}
