import { expect, mock, test } from "bun:test";
import { Request } from "express";

import { ADMIN_IDS } from "../..";
import { addDev, setAccessToken } from "../../sql";
import { adminAuthentication, devAuthentication } from "../middleware";

const next = mock(() => {});

const testDevId = "testDev";

const responseShim: Response = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  status: (code: number) => responseShim,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: (body: any) => body,
} as unknown as Response;

test("fail dev Auth", () => {
  const request: Request = {
    headers: {},
    query: {},
  } as unknown as Request;

  expect(next).not.toHaveBeenCalled();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devAuthentication(request, responseShim as unknown as any, next);

  expect(next).not.toHaveBeenCalled();

  next.mockClear();
});

test("fail dev Auth", () => {
  const request: Request = {
    headers: {},
    query: {},
  } as unknown as Request;

  expect(next).not.toHaveBeenCalled();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devAuthentication(request, responseShim as unknown as any, next);

  expect(next).not.toHaveBeenCalled();

  next.mockClear();
});

test("pass Dev auth", () => {
  addDev({
    id: testDevId,
    plugins: [],
  });
  const token = setAccessToken(testDevId);

  const request: Request = {
    headers: {
      authorization: token,
    },
    query: {},
  } as unknown as Request;

  expect(next).not.toHaveBeenCalled();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devAuthentication(request, responseShim as unknown as any, next);

  expect(next).toHaveBeenCalled();

  next.mockClear();
});

test("fail admin auth", () => {
  const token = setAccessToken(testDevId);

  const request: Request = {
    headers: {
      authorization: token,
    },
    query: {},
  } as unknown as Request;

  expect(next).not.toHaveBeenCalled();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminAuthentication(request, responseShim as unknown as any, next);

  expect(next).not.toHaveBeenCalled();

  next.mockClear();
});

test("pass admin auth", () => {
  const token = setAccessToken(ADMIN_IDS[0]);

  const request: Request = {
    headers: {
      authorization: token,
    },
    query: {},
  } as unknown as Request;

  expect(next).not.toHaveBeenCalled();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminAuthentication(request, responseShim as unknown as any, next);

  expect(next).toHaveBeenCalled();

  next.mockClear();
});
