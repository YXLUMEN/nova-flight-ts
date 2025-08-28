export interface Effect {
  alive: boolean;
  tick(tickDelta: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}
