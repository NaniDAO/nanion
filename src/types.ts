import { z } from "zod";
import type { Address, Hex } from "viem";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import logger from "./logger";

export enum ChainId {
  Arbitrum = 42161,
}

export const EntryPoint = {
  V7: ENTRYPOINT_ADDRESS_V07 as Address,
} as const;

const HexSchema = z.custom<Hex>(
  (val) => /^0x[0-9a-fA-F]*$/.test(val as string),
  {
    message: "Invalid hex string",
  },
);

export const Hex32 = z.custom<`0x${string & { length: 64 }}`>(
  (val) => /^0x[0-9a-fA-F]{64}$/.test(val as string),
  {
    message: "Invalid 32-byte hex string",
  },
);

const AddressSchema = z.custom<Address>(
  (val) => /^0x[0-9a-fA-F]{40}$/.test(val as string),
  {
    message: "Invalid Ethereum address",
  },
);

const BigIntSchema = z.union([
  z.bigint(),
  z
    .string()
    .refine(
      (val) => {
        try {
          BigInt(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid BigInt string" },
    )
    .transform((val) => BigInt(val)),
  z
    .number()
    .int()
    .safe()
    .transform((val) => BigInt(val)),
  z
    .object({
      __type: z.literal("bigint"),
      value: z.string().refine(
        (val) => {
          try {
            BigInt(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Invalid BigInt string" },
      ),
    })
    .transform(({ value }) => BigInt(value)),
]);

const UserOperationSchema = z.object({
  sender: AddressSchema,
  nonce: BigIntSchema,
  factory: AddressSchema.optional(),
  factoryData: HexSchema.optional(),
  callData: HexSchema,
  callGasLimit: BigIntSchema,
  verificationGasLimit: BigIntSchema,
  preVerificationGas: BigIntSchema,
  maxFeePerGas: BigIntSchema,
  maxPriorityFeePerGas: BigIntSchema,
  paymaster: AddressSchema.optional(),
  paymasterVerificationGasLimit: BigIntSchema.optional(),
  paymasterPostOpGasLimit: BigIntSchema.optional(),
  paymasterData: HexSchema.optional(),
  signature: HexSchema,
});

const PackedUserOperationSchema = z.object({
  sender: AddressSchema,
  nonce: BigIntSchema,
  initCode: HexSchema,
  callData: HexSchema,
  accountGasLimits: BigIntSchema,
  preVerificationGas: BigIntSchema,
  gasFees: BigIntSchema,
  paymasterAndData: HexSchema,
  signature: HexSchema,
});

const RequestBodySchema = z.object({
  userop: UserOperationSchema,
  entryPoint: z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => val === EntryPoint.V7.toLowerCase(), {
      message: `Invalid entry point. Only V7 (${EntryPoint.V7}) is supported.`,
    })
    .transform((val) => val as Address),
  chainId: z.nativeEnum(ChainId),
});

export type UserOperation = z.infer<typeof UserOperationSchema>;
export type PackedUserOperation = z.infer<typeof PackedUserOperationSchema>;
export type ValidatedRequestBody = z.infer<typeof RequestBodySchema>;
export type Hex32 = z.infer<typeof Hex32>;

export const validateUserOpRequest = (data: unknown): ValidatedRequestBody => {
  logger.info({ data }, "Validating userOp request");
  const parsedData = {
    userop:
      typeof data?.userop === "string" ? JSON.parse(data.userop) : data?.userop,
    entryPoint: data?.entryPoint,
    chainId: data?.chainId,
  };
  logger.info({ parsedData }, "Parsed data:");
  try {
    return RequestBodySchema.parse(parsedData);
  } catch (error) {
    console.error("Validation error:", error);
    throw error;
  }
};

const GetScheduledOpsRequest = z.object({
  sender: AddressSchema,
  chainId: z.nativeEnum(ChainId).optional(),
});

export const validateGetScheduledOps = (
  data: unknown,
): { sender: Address; chainId?: number } => {
  logger.info({ data }, "Validating getScheduledOps request");
  return GetScheduledOpsRequest.parse(data);
};

const GetNonceRequest = z.object({
  sender: AddressSchema,
  key: BigIntSchema,
  chainId: z.nativeEnum(ChainId).optional(),
});

export const validateGetNonce = (
  data: unknown,
): { sender: Address; key: bigint; chainId?: number } => {
  return GetNonceRequest.parse(data);
};
