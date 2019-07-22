
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../material/material.module';
import { DialogAlertComponent } from './components/dialog-alert/dialog-alert.component';



@NgModule({
    declarations: [
      DialogAlertComponent,
    ],
    imports: [
    // Angular
    CommonModule,
    RouterModule,
    // Angular Flex-Layout
    FlexLayoutModule,
    // Angular Material
    MaterialModule,
    ],
    entryComponents: [
      DialogAlertComponent
    ],
    exports: [
    ],
    providers: [
    ],
  })
  export class SharedModule { }
