export class GaussianRandom {
    private spare: number | null = null;

    public nextGaussian(mean = 0, stddev = 1): number {
        if (this.spare !== null) {
            const value = this.spare;
            this.spare = null;
            return mean + stddev * value;
        }

        let u: number, v: number, s: number;
        do {
            u = Math.random() * 2 - 1; // [-1,1)
            v = Math.random() * 2 - 1;
            s = u * u + v * v;
        } while (s === 0 || s >= 1);

        const mul = Math.sqrt(-2.0 * Math.log(s) / s);
        this.spare = v * mul;
        return mean + stddev * (u * mul);
    }
}
