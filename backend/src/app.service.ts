import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      success: true,
      status: 'ok',
    };
  }
}
