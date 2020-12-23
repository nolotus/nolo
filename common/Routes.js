import Home from "../pages/Home";
import Create from "../pages/Create";
import Life from "../pages/Life";
import Find from "../pages/Find";
import Self from "../pages/Self";
import {Setting} from "../pages/Setting";

import {Page} from "../pages/Page";

const Routes = [
  {
    exact: true,
    path: "/",
    component: Home,
  },
  {
    path: "/create",
    component: Create,
  },
  {
    path: "/life",
    component: Life,
  },
  {
    path: "/find",
    component: Find,
  },
  {
    path: "/self",
    component: Self,
  },
  {
    path: "/setting",
    component: Setting,
  },
  {
    path: "/:id",
    component: Page,
  },
];

export default Routes;
