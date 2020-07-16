import * as fs from "fs";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import path from "path";

const outputFolder = __dirname

const mdnDeprecatedApisFile = path.join(outputFolder, "mdnDeprecatedApis.json");
const mdnObsoleteApisFile = path.join(outputFolder, "mdnObsoleteApis.json");
const mdnDeprecatedApisReasonFile = path.join(outputFolder, "mdnDeprecatedApisReason.json");
const mdnObsoleteApisReasonFile = path.join(outputFolder, "mdnObsoleteApisReason.json");

const mdnApiWeb = "https://developer.mozilla.org/en-US/docs/Web/API"

async function fetchInterfaceDescriptions() {
    const fragment = await fetchDom(mdnApiWeb);
    const InterfacesSelector = '#wikiArticle > div:nth-child(8)';

    const interfacesFragment = fragment.querySelector(InterfacesSelector);

    if (!interfacesFragment) {
        // This is not that right, but is better than nothing.
        throw new Error("css selector for interfaces has been changed!");
    }

    const deprecatedIconSelector = '.icon-thumbs-down-alt';
    const deprecatedAPIs = [];

    for (const deprecatedIconElem of interfacesFragment.querySelectorAll(deprecatedIconSelector)) {
        const deprecatedAPI = deprecatedIconElem?.parentElement?.parentElement?.previousSibling?.textContent;
        if (!deprecatedAPI) {
            console.dir(deprecatedIconElem);
            throw new Error("some element could not ");
        }
        deprecatedAPIs.push(deprecatedAPI);
    }

    const obsoleteIconSelector = '.icon-trash';
    const obsoleteAPIs = [];
    for (const obsoleteIconElem of interfacesFragment.querySelectorAll(obsoleteIconSelector)) {
        const obsoleteAPI = obsoleteIconElem?.parentElement?.parentElement?.previousSibling?.textContent;
        if (!obsoleteAPI) {
            console.dir(obsoleteIconElem);
            throw new Error("some element could not ");
        }
        obsoleteAPIs.push(obsoleteAPI);
    }

    fs.writeFileSync(mdnDeprecatedApisFile, JSON.stringify(deprecatedAPIs));
    fs.writeFileSync(mdnObsoleteApisFile, JSON.stringify(obsoleteAPIs));
}

async function fetchDeprecatedApiReasons() {
    await fetchInterfaceDescriptions();

    const deprecatedAPIArray: string[] = require(mdnDeprecatedApisFile);
    const obsoleteAPIArray: string[] = require(mdnObsoleteApisFile);

    // const maekDeprecatedJsdocApiArray = [...deprecatedAPIArray, ...obsoleteAPIArray];

    // const deprecatedAPIArray: string[] = JSON.parse(s);
    // use Promise.all to acclete.
    const mdnDeprecatedApisReason: Record<string, string> = {};
    const mdnObsoleteApisReason: Record<string, string> = {};

    Promise.all(deprecatedAPIArray.map(async apiName => {
        const fragment = await fetchDom(`${mdnApiWeb}/${apiName}`);

        let isSearchedArea = true;
        const searchArea = Array.from(fragment.querySelector("#wikiArticle")?.children!).filter(item => {
            if (item.tagName === "H2") {
                isSearchedArea = false;
            }
            return isSearchedArea;
        });
        const reason1 = searchArea.find(e => e.className.split(' ').includes("warning"))?.textContent;
        const reason2 = searchArea.find(e => e.className.split(' ').includes("note"))?.textContent;

        // const reason1 = fragment.querySelector("#wikiArticle > .warning")?.textContent;
        // const reason2 = fragment.querySelector("#wikiArticle > .note")?.textContent;

        if (reason1 && reason2) {
            throw new Error("not consider situation! api name is " + apiName);
        }
        if (!reason1 && !reason2) {
            return Promise.resolve();
        }
        const reason = reason1 ?? reason2;
        if (!reason) {
            throw new Error("impossiable");
        }
        mdnDeprecatedApisReason[apiName] = reason.substring(reason.indexOf(':') + 1).replace("\n", "");
    })).then(() => {
        fs.writeFileSync(mdnDeprecatedApisReasonFile, JSON.stringify(mdnDeprecatedApisReason));
    })

    Promise.all(obsoleteAPIArray.map(async apiName => {
        const fragment = await fetchDom(`${mdnApiWeb}/${apiName}`);

        let isSearchedArea = true;
        const searchArea = Array.from(fragment.querySelector("#wikiArticle")?.children!).filter(item => {
            if (item.tagName === "H2") {
                isSearchedArea = false;
            }
            return isSearchedArea;
        });
        const reason1 = searchArea.find(e => e.className.split(' ').includes("warning"))?.textContent;
        const reason2 = searchArea.find(e => e.className.split(' ').includes("note"))?.textContent;

        // const reason1 = fragment.querySelector("#wikiArticle > .warning")?.textContent;
        // const reason2 = fragment.querySelector("#wikiArticle > .note")?.textContent;

        if (reason1 && reason2 && apiName !== "IDBEnvironment") {
            throw new Error("not consider situation! api name is " + apiName);
        }
        if (!reason1 && !reason2) {
            return Promise.resolve();
        }
        const reason = reason1 ?? reason2;
        if (!reason) {
            throw new Error("impossiable");
        }
        mdnObsoleteApisReason[apiName] = reason.substring(reason.indexOf(':') + 1).replace("\n", "");
    })).then(() => {
        fs.writeFileSync(mdnObsoleteApisReasonFile, JSON.stringify(mdnObsoleteApisReason));
    })
}

async function fetchDom(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const responseString = await response.text();

    return JSDOM.fragment(responseString);
}

fetchDeprecatedApiReasons();