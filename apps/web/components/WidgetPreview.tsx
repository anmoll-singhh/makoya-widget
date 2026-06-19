"use client";
import { LAUNCHER_ICONS, type LauncherIconKey, type WidgetPosition } from "@makoya/shared";

const CORNER: Record<WidgetPosition, string> = {
  "bottom-right": "bottom-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "top-right": "top-3 right-3",
  "top-left": "top-3 left-3",
};

export function WidgetPreview({ color, position, icon }: { color: string; position: WidgetPosition; icon: LauncherIconKey }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
      </div>
      <div className="relative h-72 bg-white p-5">
        <div className="space-y-2">
          <div className="h-3 w-2/3 rounded bg-neutral-200" />
          <div className="h-3 w-1/2 rounded bg-neutral-100" />
          <div className="h-3 w-3/5 rounded bg-neutral-100" />
        </div>
        <button
          aria-hidden
          className={`absolute grid h-12 w-12 place-items-center rounded-full text-white shadow-lg ${CORNER[position]}`}
          style={{ background: color }}
          dangerouslySetInnerHTML={{ __html: scaleIcon(LAUNCHER_ICONS[icon]) }}
        />
      </div>
    </div>
  );
}

/** The shared SVG has no explicit size; constrain it for the preview button. */
function scaleIcon(svg: string): string {
  return svg.replace("<svg ", '<svg width="26" height="26" ');
}
