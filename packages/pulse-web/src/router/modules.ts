import { markRaw } from "vue"
import { type RouteRecordRaw } from "vue-router"
import { ChartNoAxesCombined, Database } from "@lucide/vue"

export const RouterModules: RouteRecordRaw[] = [
  {
    path: "/live",
    component: () => import("@/views/live/Live.vue"),
    meta: {
      icon: markRaw(ChartNoAxesCombined),
      title: "市场行情",
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
        path: "/pine_scripts_manager",
        component: () => import("@/views/managers/pine_scripts_manager/PineScriptsManager.vue"),
        meta: {
          icon: "",
          title: "Pine脚本管理",
        },
      },
      {
        path: "/pine-playground",
        component: () => import("@/views/managers/pine_playground/PinePlayground.vue"),
        meta: {
          icon: "",
          title: "PineTS Playground",
        },
      },
    ],
  },
]
