import { navigate } from "./lib";

// A normal <a href> (so crawlers and open-in-new-tab work) that navigates without a page reload.
export default function Link({ to, onClick, ...rest }) {
  function handle(e) {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handle} {...rest} />;
}
