import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, signal, WritableSignal, ChangeDetectionStrategy, AfterViewChecked, Signal, computed, InjectionToken } from '@angular/core';
import { BroadcastChannelService } from 'broadcast-channel';
import { Subscription } from 'rxjs';

export const BROADCAST_CHANNEL = new InjectionToken<BroadcastChannel>('Message Channel');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AsyncPipe],
  providers: [
    {
      provide: BROADCAST_CHANNEL,
      useFactory: () => new BroadcastChannel('crypto'),
    },
  ],
})
export class AppComponent implements OnDestroy, AfterViewChecked {
  title = 'turing-display';

  private readonly subscription: Subscription = new Subscription();

  receivedMessage: WritableSignal<{cyphertext: ArrayBuffer, iv:Uint8Array}> = signal({cyphertext: new ArrayBuffer(0), iv: new Uint8Array(0)});

  decryptedMessage: Signal<Promise<string>> = computed( async () => {
    if (this.currentKeyPair() && this.receivedMessage().cyphertext.byteLength > 0) {
      const cryptoKey = this.currentKeyPair()!;
      return this.decryptMessage(cryptoKey.privateKey, this.receivedMessage().cyphertext)
        .then((decrypted) => decrypted)
        .catch((error) => {
          console.error('Error decrypting message:', error);
          return 'Not possible to decrypt message with the provided key.';
        });
    } else {
      return '';
    }
  });

  currentKeyPair: WritableSignal<CryptoKeyPair | undefined> = signal(undefined);

  constructor(
    private readonly broadcastChannelService: BroadcastChannelService,
  ) {
    this.subscription.add(
      // NOTE: Subscribes for messages on the 'crypto' channel
      this.broadcastChannelService.messagesObservable('crypto').subscribe((message: any) => {
        this.receivedMessage.set(message);
      })
    );

  }

  ngAfterViewChecked(): void {
    console.log('Mudou view!');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  sendKey() {
    this.generateKey().then(async (keyPair) => {
      this.currentKeyPair.set(keyPair);
      console.log('Sending key:', keyPair.publicKey);
      const exportedKey:ArrayBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      this.broadcastChannelService.sendMessage(exportedKey, 'public-key');
    });
  }

  private async generateKey(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        // Consider using a 4096-bit key for systems that require long-term security
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  private async decryptMessage(key: CryptoKey, ciphertext: ArrayBuffer): Promise<string> {
    let decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }
}
