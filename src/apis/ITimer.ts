export type TimerTask = {
  id: number;
  at: number;                 // 触发时间（世界时间，单位秒）
  fn: () => void;
  repeat: boolean;
  interval?: number;          // repeat 时必填
  canceled: boolean;
};