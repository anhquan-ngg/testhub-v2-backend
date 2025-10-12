import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Bạn có thể giữ lại các lifecycle hooks nếu muốn thực hiện hành động gì đó
  // khi kết nối hoặc ngắt kết nối, nhưng việc connect sẽ do factory đảm nhiệm.
  async onModuleInit() {
    // Thường thì $connect sẽ được gọi trong factory, nhưng để ở đây cũng không sao
    // để đảm bảo kết nối được thiết lập.
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
