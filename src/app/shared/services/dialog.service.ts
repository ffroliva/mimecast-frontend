import { Injectable } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DialogAlertComponent } from '../components/dialog-alert/dialog-alert.component';
import { DialogAlertConfig } from '../configs/dialog-alert.config';
import { DialogNotificationConfig } from '../configs/dialog-notification.config';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(
    private bottomSheet: MatBottomSheet,
    private snackBar: MatSnackBar,
  ) { }

  showAlert(configOrMessage: DialogAlertConfig | string): void {
    const config: DialogAlertConfig = (typeof configOrMessage === 'string')
        ? { message: configOrMessage } : configOrMessage;
    const configDefault = {
      message: '',
      messages: [],
      title: 'Warning!',
      type: 'warn',
    };
    const dialog: MatBottomSheetRef = this.bottomSheet.open(DialogAlertComponent, {
      ariaLabel: 'Dialog with a message',
      data: { ...configDefault, ...config },
    });

    dialog.afterDismissed().subscribe((result?: boolean) => {
      if (config.callback) {
        config.callback(result || false);
      }
    });
  }

  showNotification(configOrMessage: DialogNotificationConfig | string): void {
    setTimeout(() => {
      const config: DialogNotificationConfig = (typeof configOrMessage === 'string')
        ? { message: configOrMessage } : configOrMessage;

      const secondsToClose = config.secondsToClose || 5;
      const message = config.message;
      const action = (config.action ? Object.keys(config.action)[0].toUpperCase() : '');

      const snackBarRef = this.snackBar.open(message, action, {
        duration: secondsToClose * 1000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      if (config.dismiss) {
        snackBarRef.afterDismissed().subscribe(config.dismiss);
      }

      if (config.action) {
        const actionCallback = Object.values(config.action);
        if (actionCallback.length) {
          snackBarRef.onAction().subscribe(actionCallback[0]);
        }
      }
    }, 50);
  }
}
