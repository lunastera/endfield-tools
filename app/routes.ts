import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("weapon-essence", "routes/weapon-essence.tsx"),
  route("skill-timeline", "routes/skill-timeline.tsx"),
] satisfies RouteConfig;
