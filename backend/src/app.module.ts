import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PlantsModule } from './plants/plants.module';
import { ProductionModule } from './production/production.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL || 60000),
        limit: Number(process.env.RATE_LIMIT_MAX || 120),
      },
    ]),
    DatabaseModule,
    AuthModule,
    PlantsModule,
    ProductionModule,
    SalesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
