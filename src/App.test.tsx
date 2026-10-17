import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders the hero heading", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Turn any worksheet into games" }),
  ).toBeInTheDocument();
});
