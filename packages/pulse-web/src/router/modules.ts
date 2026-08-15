import { markRaw } from "vue"
import { type RouteRecordRaw } from "vue-router"
import { ChartNoAxesCombined, Database, Wallet, CodeXml } from "@lucide/vue"

export const RouterModules: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/chart-space",
  },
  {
    path: "/chart-space",
    component: () => import("@/views/chart_space/ChartSpace.vue"),
    meta: {
      icon: markRaw(ChartNoAxesCombined),
      title: "市场行情",
    },
  },
  {
    path: "/accounts",
    component: () => import("@/views/accounts/AccountsRecord.vue"),
    meta: {
      icon: markRaw(Wallet),
      title: "账户",
    },
  },
  {
    path: "/scripts_workspace",
    component: () => import("@/views/scripts_workspace/ScriptsWorkspace.vue"),
    meta: {
      icon: markRaw(CodeXml),
      title: "脚本工作台",
    },
  },
  {
    path: "/managers",
    meta: {
      icon: markRaw(Database),
      title: "数据管理",
    },
    children: [
      {
        path: "/market-data-manager",
        component: () => import("@/views/managers/market_data_manager/MarketDataManager.vue"),
        meta: {
          icon: "",
          title: "行情数据管理",
        },
      },
    ],
  },
]
