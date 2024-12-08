import { ChangeDetectionStrategy, Component, computed, InjectionToken, signal, Signal, WritableSignal } from '@angular/core';
import { BroadcastChannelService } from 'broadcast-channel';
import { Subscription } from 'rxjs';

export const BROADCAST_CHANNEL = new InjectionToken<BroadcastChannel>('Message Channel');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [
    {
      provide: BROADCAST_CHANNEL,
      useFactory: () => new BroadcastChannel('crypto'),
    },
  ],
})
export class AppComponent {
  title = 'enigma';

  private readonly subscription: Subscription = new Subscription();

  public message = '';
  public crypted_message = '';
  public key: CryptoKeyPair | undefined;

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

  constructor(private readonly broadcastChannelService: BroadcastChannelService) {
    // NOTE: Subscribes for keys on the 'public-key' channel
    this.subscription.add(
      this.broadcastChannelService.messagesObservable('public-key').subscribe(async (rawKey: any) => {
        console.log('Received key:', rawKey);
        this.rawKey.set(new TextDecoder().decode(rawKey));
        const importedKey = await window.crypto.subtle.importKey(
          "spki",
          rawKey,
          {
            name: "RSA-OAEP",
            hash: "SHA-256",
          },
          true,
          ["encrypt"],
        );
        this.key = {publicKey: importedKey} as CryptoKeyPair;
      })
    );
  }

  sendMessage(_message: string) {
    this.cryptMessage(_message).then((crypted_message) => {
      const dec = new TextDecoder();
      this.crypted_message = dec.decode(crypted_message.cyphertext);
      this.broadcastChannelService.sendMessage(crypted_message, 'crypto');
    });
  }

  private async cryptMessage(message: string): Promise<{cyphertext: ArrayBuffer}> {
    if (!this.key) {
      return {cyphertext: new ArrayBuffer(0)};
    }

    // encode the message as an ArrayBuffer
    const enc = new TextEncoder();
    const encoded = enc.encode(message);

    // encrypt the message
    return {
      cyphertext: await crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        this.key.publicKey,
        encoded
      )
    }
  }
}
