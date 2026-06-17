import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  @IsString()
  @MinLength(1, { message: "Informe a senha" })
  password!: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: "Nome muito curto" })
  name!: string;

  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  @IsString()
  @MinLength(8, { message: "A senha precisa de no mínimo 8 caracteres" })
  password!: string;
}
