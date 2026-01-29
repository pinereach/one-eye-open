import { onRequestPost as __api_markets__marketId__orders_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/[marketId]/orders.ts"
import { onRequestGet as __api_markets__marketId__positions_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/[marketId]/positions.ts"
import { onRequestPost as __api_markets__marketId__settle_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/[marketId]/settle.ts"
import { onRequestGet as __api_markets__marketId__trades_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/[marketId]/trades.ts"
import { onRequestPost as __api_auth_login_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/auth/login.ts"
import { onRequestPost as __api_auth_logout_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/auth/logout.ts"
import { onRequestGet as __api_auth_me_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/auth/me.ts"
import { onRequestPost as __api_auth_register_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/auth/register.ts"
import { onRequestGet as __api_debug_schema_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/debug/schema.ts"
import { onRequestPost as __api_markets_suggest_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/suggest.ts"
import { onRequestGet as __api_scoring_rounds_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/scoring/rounds.ts"
import { onRequestPost as __api_scoring_rounds_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/scoring/rounds.ts"
import { onRequestGet as __api_scoring_scores_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/scoring/scores.ts"
import { onRequestPost as __api_scoring_scores_ts_onRequestPost } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/scoring/scores.ts"
import { onRequestGet as __api_markets__marketId__index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/[marketId]/index.ts"
import { onRequestDelete as __api_orders__orderId__ts_onRequestDelete } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/orders/[orderId].ts"
import { onRequestGet as __api_export_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/export.ts"
import { onRequestGet as __api_markets_index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/markets/index.ts"
import { onRequestGet as __api_orders_index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/orders/index.ts"
import { onRequestGet as __api_participants_index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/participants/index.ts"
import { onRequestGet as __api_positions_index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/positions/index.ts"
import { onRequestGet as __api_trades_index_ts_onRequestGet } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/api/trades/index.ts"
import { onRequest as ___middleware_ts_onRequest } from "/Users/dhuffman/Documents/GitHub/one-eye-open1/functions/_middleware.ts"

export const routes = [
    {
      routePath: "/api/markets/:marketId/orders",
      mountPath: "/api/markets/:marketId",
      method: "POST",
      middlewares: [],
      modules: [__api_markets__marketId__orders_ts_onRequestPost],
    },
  {
      routePath: "/api/markets/:marketId/positions",
      mountPath: "/api/markets/:marketId",
      method: "GET",
      middlewares: [],
      modules: [__api_markets__marketId__positions_ts_onRequestGet],
    },
  {
      routePath: "/api/markets/:marketId/settle",
      mountPath: "/api/markets/:marketId",
      method: "POST",
      middlewares: [],
      modules: [__api_markets__marketId__settle_ts_onRequestPost],
    },
  {
      routePath: "/api/markets/:marketId/trades",
      mountPath: "/api/markets/:marketId",
      method: "GET",
      middlewares: [],
      modules: [__api_markets__marketId__trades_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestPost],
    },
  {
      routePath: "/api/debug/schema",
      mountPath: "/api/debug",
      method: "GET",
      middlewares: [],
      modules: [__api_debug_schema_ts_onRequestGet],
    },
  {
      routePath: "/api/markets/suggest",
      mountPath: "/api/markets",
      method: "POST",
      middlewares: [],
      modules: [__api_markets_suggest_ts_onRequestPost],
    },
  {
      routePath: "/api/scoring/rounds",
      mountPath: "/api/scoring",
      method: "GET",
      middlewares: [],
      modules: [__api_scoring_rounds_ts_onRequestGet],
    },
  {
      routePath: "/api/scoring/rounds",
      mountPath: "/api/scoring",
      method: "POST",
      middlewares: [],
      modules: [__api_scoring_rounds_ts_onRequestPost],
    },
  {
      routePath: "/api/scoring/scores",
      mountPath: "/api/scoring",
      method: "GET",
      middlewares: [],
      modules: [__api_scoring_scores_ts_onRequestGet],
    },
  {
      routePath: "/api/scoring/scores",
      mountPath: "/api/scoring",
      method: "POST",
      middlewares: [],
      modules: [__api_scoring_scores_ts_onRequestPost],
    },
  {
      routePath: "/api/markets/:marketId",
      mountPath: "/api/markets/:marketId",
      method: "GET",
      middlewares: [],
      modules: [__api_markets__marketId__index_ts_onRequestGet],
    },
  {
      routePath: "/api/orders/:orderId",
      mountPath: "/api/orders",
      method: "DELETE",
      middlewares: [],
      modules: [__api_orders__orderId__ts_onRequestDelete],
    },
  {
      routePath: "/api/export",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_export_ts_onRequestGet],
    },
  {
      routePath: "/api/markets",
      mountPath: "/api/markets",
      method: "GET",
      middlewares: [],
      modules: [__api_markets_index_ts_onRequestGet],
    },
  {
      routePath: "/api/orders",
      mountPath: "/api/orders",
      method: "GET",
      middlewares: [],
      modules: [__api_orders_index_ts_onRequestGet],
    },
  {
      routePath: "/api/participants",
      mountPath: "/api/participants",
      method: "GET",
      middlewares: [],
      modules: [__api_participants_index_ts_onRequestGet],
    },
  {
      routePath: "/api/positions",
      mountPath: "/api/positions",
      method: "GET",
      middlewares: [],
      modules: [__api_positions_index_ts_onRequestGet],
    },
  {
      routePath: "/api/trades",
      mountPath: "/api/trades",
      method: "GET",
      middlewares: [],
      modules: [__api_trades_index_ts_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_ts_onRequest],
      modules: [],
    },
  ]