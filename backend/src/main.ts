import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import {AppModule} from './app.module';
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {rawBody: true}); // rawBody needed for Stripe webhook signature verification

    app.use(helmet());
    app.use(compression());

    app.enableCors({
        origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    // eslint-disable-next-line no-console
    console.log(`QR SaaS backend listening on :${port}`);
}

bootstrap();