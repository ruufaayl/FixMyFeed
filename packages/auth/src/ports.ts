export type AuthEmailPurpose = "verify_email" | "reset_password";

export interface AuthEmailMessage {
  readonly purpose: AuthEmailPurpose;
  readonly to: string;
  readonly url: string;
}

export interface AuthEmailDelivery {
  sendVerificationEmail(message: AuthEmailMessage): Promise<void>;
  sendPasswordResetEmail(message: AuthEmailMessage): Promise<void>;
}

export type AuthTelemetryEvent =
  | {
      readonly type: "auth_configured";
      readonly emailDelivery: "available" | "unavailable";
      readonly secureCookies: boolean;
    }
  | {
      readonly type: "auth_email_delivery";
      readonly purpose: AuthEmailPurpose;
      readonly outcome: "succeeded" | "failed";
    };

export interface AuthTelemetry {
  record(event: AuthTelemetryEvent): void | Promise<void>;
}
