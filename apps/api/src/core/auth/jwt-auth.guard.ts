import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Exige um Bearer token válido. Equivalente ao `requireUser()` das actions. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
