import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { DialogAlertConfig } from '../../configs/dialog-alert.config';

@Component({
  selector: 'app-dialog-alert',
  templateUrl: './dialog-alert.component.html',
  styleUrls: ['./dialog-alert.component.scss']
})
export class DialogAlertComponent {

  config: DialogAlertConfig;

  constructor(
    private bottomSheetRef: MatBottomSheetRef<DialogAlertComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) data: any,
  ) {
    this.config = data as DialogAlertConfig;
  }

  closeMe(): void {
    this.bottomSheetRef.dismiss(true);
  }
}
