export interface Effect {
  alive: boolean;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}
