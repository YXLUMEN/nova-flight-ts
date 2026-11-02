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

class ConsoleSink implements Sink {


    public env(text: string): void {
        console.log(text);
    }

    public section(title: string, desc?: string) {
        console.log(`\n== ${title} ==${desc ? `\n   ${desc}` : ""}`);
    }

    public table(head: string[], rows: Cell[][]): void {
        const all = [head, ...rows.map(r => r.map(this.cellText))];

        const widths = head.map((_, i) => Math.max(...all.map(r => displayWidth(r[i]!))));

        for (const [index, row] of all.entries()) {
            console.log("   " + row.map((c, i) => padToWidth(c, widths[i]!)).join("  "));
            if (index !== 0) continue;

            console.log("   " + widths.map(w => "-".repeat(w)).join("  "));
        }
    }

    public note(text: string): void {
        console.log(`   ${text}`);
    }

    private cellText(c: Cell) {
        return typeof c === "string" ? c : c.t;
    }
}

class DOMSink implements Sink {
    private readonly out: HTMLElement;

    public constructor(out: HTMLElement) {
        this.out = out;
    }

    public env(text: string): void {
        document.getElementById("env")!.textContent = text;
    }

    public section(title: string, desc?: string) {
        const h = document.createElement("h2");
        h.textContent = title;
        this.out.append(h);
        if (!desc) return;

        const p = document.createElement("p");
        p.className = "note";
        p.textContent = desc;
        this.out.append(p);
    }

    public table(head: string[], rows: Cell[][]) {
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
        this.out.append(table);
    }

    public note(text: string): void {
        const p = document.createElement("p");
        p.className = "note";
        p.textContent = text;
        this.out.append(p);
    }
}

export function createSink(): Sink {
    if (typeof document === "undefined") {
        return new ConsoleSink();
    }

    const out = document.getElementById("out")!;
    return new DOMSink(out);
}
