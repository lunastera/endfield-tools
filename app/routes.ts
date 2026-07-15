import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("weapon-essence", "routes/weapon-essence.tsx"),
] satisfies RouteConfig;
