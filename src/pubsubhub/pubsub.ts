import pubSubHubbub = require('pubsubhubbub');

export class PubSub {

  public static init() {
    console.log('Début initialisation pubsub');

    const option = { callbackUrl: 'http://24740bba.ngrok.io' };

    const pubSubSubscriber = pubSubHubbub.createServer(option);
    pubSubSubscriber.on('feed', (data) => {
      console.log(data);
      console.log(data.feed.toString());
    });

    pubSubSubscriber.on('subscribe', (data) => {
      console.log(data.topic + ' subscribed');
    });

    const errCall = (err) => {
      if (err) {
        console.log(err);
      }
    };

    const hub = 'http://pubsubhubbub.appspot.com/';
    pubSubSubscriber.on('listen', () => {
      pubSubSubscriber.subscribe('https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCVeMw72tepFl1Zt5fvf9QKQ', hub, errCall);
      pubSubSubscriber.subscribe('https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCdnaDhU-LDQrIEEmSIfq0-Q', hub, errCall);
      pubSubSubscriber.subscribe('https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCGBpxWJr9FNOcFYA5GkKrMg', hub, errCall);
    });

    pubSubSubscriber.listen(3001);
  }

}
