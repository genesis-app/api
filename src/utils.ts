import { CurrentGenesisVersions } from ".";

export function rand() {
  return Math.random().toString(36).substr(2); // remove `0.`
}

export function randomToken() {
  return rand() + rand(); // to make it longer
}
export function getRelease() {
  interface GithubRelease {
    "created-at": string;
    tag_name: string;
    prerelease: boolean;
  }
  fetch("https://api.github.com/repos/uninit-org/genesis/releases")
    .then((i) => i.json())
    .then((i) => {
      const releases = (i as GithubRelease[]).sort(
        (a, b) =>
          new Date(b["created-at"]).getTime() -
          new Date(a["created-at"]).getTime(),
      );
      CurrentGenesisVersions.release =
        releases.find((i) => !i.prerelease)?.tag_name ?? "0.0.0";
      CurrentGenesisVersions.dev = releases[0].tag_name;
    });
}
