import { Component, CUSTOM_ELEMENTS_SCHEMA, Injector } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import  {createCustomElement} from '@angular/elements';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {

  constructor(private readonly injector: Injector) {}

  ngOnInit(): void {
    [
      {module: import('receiver/Component'), elementName: 'receiver-micro-frontend'},
      {module: import('sender/Component'), elementName: 'sender-micro-frontend'},
      {module: import('manInTheMiddle/Component'), elementName: 'man-in-the-middle-micro-frontend'},
    ].forEach(({module, elementName}) => this.loadMFEModule(module, elementName));
  }

  loadMFEModule(_module: Promise<any>, _elementName: string): void {
    _module.then(
      module => {
        const customElement = createCustomElement(module.AppComponent, {injector: this.injector});
        customElements.define(_elementName, customElement);
      }
    );
  }

  title = 'shell';
}
