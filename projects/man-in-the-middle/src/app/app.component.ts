import { Subscription } from 'rxjs';
import { Component, computed, effect, OnDestroy, Signal, signal, WritableSignal } from '@angular/core';
import { BroadcastChannelService } from 'broadcast-channel';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  title = 'man-in-the-middle';
  receivedMessages: string[] = [];
  private readonly subscription = new Subscription();

  // Message signals
  receivedMessage: WritableSignal<{cyphertext: ArrayBuffer, iv:Uint8Array}> = signal({cyphertext: new ArrayBuffer(0), iv: new Uint8Array(0)});
  cryptedHexaMessage: Signal<string> = computed(() => {
    if (this.receivedMessage().cyphertext.byteLength > 0) {
        const view = new DataView(this.receivedMessage().cyphertext);
        let binary = '';
        for (let i = 0; i < view.byteLength; i++) {
          binary += view.getUint8(i).toString(16);
        }
        return binary;
    } else {
      return '';
    }
  });

  // Key signals
  rawKey: WritableSignal<string> = signal('');
  cryptedHexaKey: Signal<string> = computed(() => {
    if (this.rawKey().length > 0) {
        let binary = '';
        for (let i = 0; i < this.rawKey().length; i++) {
          binary += this.rawKey().charCodeAt(i).toString(16);
        }
        return binary;
    } else {
      return '';
    }
  });

  constructor(
    private readonly broadcastChannelService: BroadcastChannelService
  ) {
    this.subscription.add(
      this.broadcastChannelService.messagesObservable('crypto').subscribe((message: any) => {
        this.receivedMessage.set(message);
      })
    );
    this.subscription.add(
      this.broadcastChannelService.messagesObservable('public-key').subscribe(async (rawKey: any) => {
        this.rawKey.set(new TextDecoder().decode(rawKey));
      })
    );

    effect(() => {
      if (this.cryptedHexaMessage()) {
        this.receivedMessages.push(`Intercepted message: ${this.cryptedHexaMessage().slice(0, 10)}...`);
      }
    });
    effect(() => {
      if (this.cryptedHexaKey()) {
        this.receivedMessages.push(`Intercepted key: ${this.cryptedHexaKey().slice(0, 10)}...`);
      }
    });


  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
