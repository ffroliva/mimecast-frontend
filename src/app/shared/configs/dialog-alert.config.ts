export interface DialogAlertConfig {
  message?: string;
  messages?: string[];
  title?: string;
  type?: string;
  callback?: (result?: boolean) => void;
}
