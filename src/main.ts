  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';

  import * as admin from 'firebase-admin';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(process.env.PORT || 3000);

    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: 'https://api-athena.firebaseio.com',
    });

    displayMessage();

  }
  bootstrap();

  function displayMessage() {
    console.log(`
  ██████╗ ██╗███████╗██████╗  ██████╗ ███████╗████████╗
  ██╔══██╗██║██╔════╝██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝
  ██████╔╝██║█████╗  ██████╔╝██║   ██║███████╗   ██║   
  ██╔══██╗██║██╔══╝  ██╔══██╗██║   ██║╚════██║   ██║   
  ██████╔╝██║██║     ██║  ██║╚██████╔╝███████║   ██║   
  ╚═════╝ ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   
                                                      
  █████╗ ██████╗ ██╗                                  
  ██╔══██╗██╔══██╗██║                                  
  ███████║██████╔╝██║                                  
  ██╔══██║██╔═══╝ ██║                                  
  ██║  ██║██║     ██║                                  
  ╚═╝  ╚═╝╚═╝     ╚═╝                                  
                                                      
  `);
  }
