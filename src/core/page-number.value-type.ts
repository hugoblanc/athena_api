import { BadRequestException } from '@nestjs/common';

export class RequestedPageValueType {
  constructor(public readonly page: number, public readonly size: number) {

    if (size < 1) {
      throw new BadRequestException('Page size must be greater than 0');
    }

    if (size > 500) {
      throw new BadRequestException('Page size must be less than 500');
    }

    if (page < 1) {
      this.page = 1;
    }
  }

  get elementToSkip(): number {
    return (this.page - 1) * this.size;
  }

  get nextPageFirstElement(): number {
    return this.page * this.size + 1;
  }
}
