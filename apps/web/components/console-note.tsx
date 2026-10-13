"use client";

import { project } from "@repo/config";
import { useEffect } from "react";

/** A note for whoever opens the console: the motto, the source, the door. */
export const ConsoleNote = () => {
  useEffect(() => {
    console.info(
      `%c${project.motto.ar}%c\n${project.motto.en}.\n\nReading the source? It is open: ${project.repoUrl}\nWrite with us: ${project.hosts.web}/en/join`,
      "font: bold 20px Ubuntu, sans-serif; color: #9c213e;",
      "font: 13px Ubuntu, sans-serif;"
    );
  }, []);
  return null;
};
