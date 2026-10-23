export type Cell = string | { t: string; cls?: string };

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
                const width = head.map((_, i) => Math.max(...all.map(r => r[i]!.length)));
                for (const [index, row] of all.entries()) {
                    console.log("   " + row.map((c, i) => c.padEnd(width[i]!)).join("  "));
                    if (index === 0) console.log("   " + width.map(w => "-".repeat(w)).join("  "));
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
