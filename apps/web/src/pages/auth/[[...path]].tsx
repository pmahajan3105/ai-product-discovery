import React from "react";
import { PreBuiltUIList } from "../../config/supertokens";
import { canHandleRoute, getRoutingComponent } from "supertokens-auth-react/ui";

export default function Auth(): JSX.Element {
  // if the user visits a page that is not handled by us (like /auth/random), then we redirect them back to the auth page.
  if (canHandleRoute(PreBuiltUIList) === false) {
    return <div>Something went wrong</div>;
  }
  
  return getRoutingComponent(PreBuiltUIList);
}