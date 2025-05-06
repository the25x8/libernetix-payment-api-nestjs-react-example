import { IsNotEmpty, IsString } from 'class-validator';

export class Process3dsRedirectDto {
  @IsString()
  MD: string;

  @IsString()
  @IsNotEmpty()
  PaRes: string;
}
