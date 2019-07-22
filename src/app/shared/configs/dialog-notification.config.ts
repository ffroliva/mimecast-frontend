export interface DialogNotificationConfig {
  message: string;
  action?: { [label: string]: () => void };
  dismiss?: () => void;
  secondsToClose?: number;
}
