import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class MaintenanceKeyGuard implements CanActivate {
  private readonly logger = new Logger(MaintenanceKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-maintenance-key'];
    const validKey = process.env.MAINTENANCE_KEY;

    if (!validKey || key !== validKey) {
      this.logger.warn('Unauthorized maintenance attempt');
      throw new UnauthorizedException('Invalid maintenance key');
    }

    return true;
  }
}
