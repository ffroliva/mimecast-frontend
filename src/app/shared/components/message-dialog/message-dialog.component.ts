import { DialogData } from '../../model/dialog-model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Inject, Component } from '@angular/core';

@Component({
  selector: 'app-message-dialog',
  templateUrl: './message-dialog.html',
  styleUrls: ['./message-dialog.scss'],
})
export class MessageDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onCloseClick(): void {
    this.dialogRef.close();
  }
}
