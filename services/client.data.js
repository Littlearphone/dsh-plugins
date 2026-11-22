/**
 * Services — runtimes, icons, ordering.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.data.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createData(d) {
      const { t } = d;

    const RUNTIMES = [
      { id: 'npm', label: 'npm', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])npm\b/ },
      { id: 'pnpm', label: 'pnpm', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])pnpm\b/ },
      { id: 'yarn', label: 'yarn', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])yarn\b/ },
      {
        id: 'node',
        label: 'node',
        tint: '#5FA04E',
        icon: 'node',
        pattern: /(^|[\s/\\])(node|tsx|ts-node|nodemon|vite|next|webpack|rollup|esbuild|jest|vitest|mocha)\b/,
      },
      { id: 'go', label: 'go', tint: '#00ADD8', icon: 'go', pattern: /(^|[\s/\\])go\b/ },
      { id: 'maven', label: 'mvn', tint: '#3574F0', icon: 'maven', pattern: /(^|[\s/\\])(mvn|mvnd)\b/ },
      {
        id: 'gradle',
        label: 'gradle',
        tint: '#0F8A6A',
        icon: 'gradle',
        pattern: /(^|[\s/\\])(gradle|gradlew)\b/,
      },
      { id: 'java', label: 'java', tint: '#0074BD', icon: 'java', pattern: /(^|[\s/\\])(java|javac)\b/ },
      {
        id: 'python',
        label: 'python',
        tint: '#3776AB',
        icon: 'python',
        pattern: /(^|[\s/\\])(python|python3|uv|poetry|pipenv|pytest|django-admin)\b/,
      },
      {
        id: 'docker',
        label: 'docker',
        tint: '#2496ED',
        icon: 'docker',
        pattern: /(^|[\s/\\])docker(-compose)?\b/,
      },
      { id: 'dotnet', label: '.net', tint: '#512BD4', icon: 'dotnet', pattern: /(^|[\s/\\])dotnet\b/ },
    ];

    /**
     * The official marks: monochrome path data, filled with currentColor so the
     * runtime tint carries the colour. All but one are 24x24 Simple Icons (CC0)
     * paths. Maven is the exception: the entry carries its own viewBox and comes
     * from JetBrains' expUI icon set (Apache-2.0), because that is the Maven mark
     * developers actually recognise — Apache's logo changed in 2025 and the new
     * oak leaf is known to almost nobody. Trademarks belong to their owners.
     */
    const BRAND_ICONS = {
      go: 'M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.174-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.115.175-.795.514-1.204 1.274-1.192 2.22.011.935.654 1.706 1.577 1.835.795.105 1.46-.175 1.987-.77.105-.13.198-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35.152-.362.432-.97.596-1.274a.315.315 0 01.292-.187h4.253c-.023.316-.023.631-.07.947a4.983 4.983 0 01-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986-1.145.152-2.209-.07-3.143-.77-.865-.655-1.356-1.52-1.484-2.595-.152-1.274.222-2.419.993-3.424.83-1.086 1.928-1.776 3.272-2.02 1.098-.2 2.15-.07 3.096.571.62.41 1.063.97 1.356 1.648.07.105.023.164-.117.2m3.868 6.461c-1.064-.024-2.034-.328-2.852-1.029a3.665 3.665 0 01-1.262-2.255c-.21-1.32.152-2.489.947-3.529.853-1.122 1.881-1.706 3.272-1.95 1.192-.21 2.314-.095 3.33.595.923.63 1.496 1.484 1.648 2.605.198 1.578-.257 2.863-1.344 3.962-.771.783-1.718 1.273-2.805 1.495-.315.06-.63.07-.934.106zm2.78-4.72c-.011-.153-.011-.27-.034-.387-.21-1.157-1.274-1.81-2.384-1.554-1.087.245-1.788.935-2.045 2.033-.21.912.234 1.835 1.075 2.21.643.28 1.285.244 1.905-.07.923-.48 1.425-1.228 1.484-2.233z',
      node: 'M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z',
      npm: 'M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z',
      // IDEA's own mark — the one people actually recognise. Apache's 2025
      // oak leaf is official but nobody knows it, and the pre-2025 cross
      // feathers are gone from the site, so recognition wins here.
      maven: {
        viewBox: '0 0 16 16',
        paths: [
          {
            d: 'M13.1621 3.20095C15.2238 3.20095 15.582 4.93562 15.2238 6.49867L13.8964 12.5115C13.801 12.9438 13.3555 13.2206 12.9015 13.1297C12.4476 13.0388 12.1569 12.6146 12.2524 12.1823L13.5034 6.49867C14.0739 4.02014 10.839 4.32583 9.52649 6.16628L8.11076 12.5159C8.0153 12.9482 7.56989 13.2251 7.1159 13.1342C7.09727 13.1304 7.07892 13.1261 7.06087 13.1213C6.6287 13.015 6.35674 12.6025 6.44951 12.1823L7.7054 6.4947C7.96685 5.37561 7.42991 4.82527 6.65007 4.72885C5.72182 4.6293 4.4504 5.17572 3.74084 6.17069L3.7399 6.16398L3.73837 6.16628L2.31807 12.522C2.22161 12.9542 1.77556 13.2301 1.32178 13.1382C0.867995 13.0464 0.578324 12.6215 0.674778 12.1894L2.5029 3.99827C2.59936 3.5661 3.04541 3.29022 3.49919 3.38208C4.01496 3.48649 4.22722 3.95949 4.12783 4.41318C5.07731 3.66511 6.18382 3.13659 7.44866 3.20608C8.6834 3.2309 9.28702 3.89438 9.48446 4.76224C10.6229 3.78903 11.5848 3.20095 13.1621 3.20095Z',
          },
        ],
      },
      gradle: 'M22.695 4.297a3.807 3.807 0 0 0-5.29-.09.368.368 0 0 0 0 .533l.46.47a.363.363 0 0 0 .474.032 2.182 2.182 0 0 1 2.86 3.291c-3.023 3.02-7.056-5.447-16.211-1.083a1.24 1.24 0 0 0-.534 1.745l1.571 2.713a1.238 1.238 0 0 0 1.681.461l.037-.02-.029.02.688-.384a16.083 16.083 0 0 0 2.193-1.635.384.384 0 0 1 .499-.016.357.357 0 0 1 .016.534 16.435 16.435 0 0 1-2.316 1.741H8.77l-.696.39a1.958 1.958 0 0 1-.963.25 1.987 1.987 0 0 1-1.726-.989L3.9 9.696C1.06 11.72-.686 15.603.26 20.522a.363.363 0 0 0 .354.296h1.675a.363.363 0 0 0 .37-.331 2.478 2.478 0 0 1 4.915 0 .36.36 0 0 0 .357.317h1.638a.363.363 0 0 0 .357-.317 2.478 2.478 0 0 1 4.914 0 .363.363 0 0 0 .358.317h1.627a.363.363 0 0 0 .363-.357c.037-2.294.656-4.93 2.42-6.25 6.108-4.57 4.502-8.486 3.088-9.9zm-6.229 6.901l-1.165-.584a.73.73 0 1 1 1.165.587z',
      // IDEA's Java file icon — a coffee cup, which is what people recognise.
      // The cup keeps JetBrains' own colours; the saucer and handle are the
      // same orange, so the badge reads at 14px where a silhouette of Duke
      // (Simple Icons' mark) was just a blob.
      // Devicon's Java mark: the blue/red steam every Java developer reads as
      // "Java" at a glance. The drawing is MIT (devicon), the mark itself is
      // Oracle's trademark — the badge only labels a row, it is not this
      // tool's own logo (see README).
      java: {
        viewBox: '0 0 128 128',
        paths: [
          { d: 'M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z', fill: '#0074BD' },
          { d: 'M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z', fill: '#EA2D2E' },
          { d: 'M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z', fill: '#0074BD' },
          { d: 'M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z', fill: '#EA2D2E' },
          { d: 'M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z', fill: '#0074BD' },
        ],
      },
      python: 'M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z',
      docker: 'M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z',
      dotnet: 'M24 8.77h-2.468v7.565h-1.425V8.77h-2.462V7.53H24zm-6.852 7.565h-4.821V7.53h4.63v1.24h-3.205v2.494h2.953v1.234h-2.953v2.604h3.396zm-6.708 0H8.882L4.78 9.863a2.896 2.896 0 0 1-.258-.51h-.036c.032.189.048.592.048 1.21v5.772H3.157V7.53h1.659l3.965 6.32c.167.261.275.442.323.54h.024c-.04-.233-.06-.629-.06-1.185V7.529h1.372zm-8.703-.693a.868.829 0 0 1-.869.829.868.829 0 0 1-.868-.83.868.829 0 0 1 .868-.828.868.829 0 0 1 .869.829Z',
    };

    /** Fallback for a command whose tool is not recognised. */
    const GENERIC_ICON = 'M9 5.5 19 12 9 18.5z';

    /** Earliest-matching runtime for one command line, or undefined for the generic glyph. */
    function detectRuntime(command) {
      const text = String(command ?? '');
      let best;
      let bestIndex = Number.POSITIVE_INFINITY;
      for (const runtime of RUNTIMES) {
        const match = runtime.pattern.exec(text);
        if (match === null) continue;
        const index = match.index + match[1].length;
        if (index < bestIndex) {
          best = runtime;
          bestIndex = index;
        }
      }
      return best;
    }

    /**
     * The tool a row belongs to. A row may name it itself (`category`): a Java
     * `main` is started through `exec:java`, so its command line begins with the
     * Maven runner, but the thing being run is a Java program — badging it as
     * Maven makes the list lie. The command line stays the fallback for npm
     * scripts and for anything that carries no category.
     */
    const CATEGORY_RUNTIME = { javac: 'java' };

    function runtimeOf(script) {
      const category = typeof script === 'string' ? undefined : script?.category;
      const declared = typeof category === 'string' ? (CATEGORY_RUNTIME[category] ?? category) : '';
      if (declared !== '') {
        const match = RUNTIMES.find((runtime) => runtime.id === declared);
        if (match !== undefined) return match;
      }
      return detectRuntime(typeof script === 'string' ? script : script?.command);
    }

    /**
     * The badge that fronts one script row: the tool's own mark, tinted by the
     * tool. A mark is either one 24x24 path or a `{ viewBox, paths }` group, so a
     * glyph drawn on another grid (Maven's M from IDEA, Java's steam from
     * Devicon) fits without a second code path. A path may carry its own fill and
     * stroke; without one it takes the badge's tint.
     */
    function RuntimeBadge(script, key) {
      const runtime = runtimeOf(script);
      const mark = runtime === undefined ? undefined : BRAND_ICONS[runtime.icon];
      const glyph =
        typeof mark === 'string'
          ? { viewBox: '0 0 24 24', paths: [{ d: mark }] }
          : mark ?? { viewBox: '0 0 24 24', paths: [{ d: GENERIC_ICON }] };
      // A mark that brings its own colours (Devicon's blue/red steam) must not sit
      // on a plate of the tool's tint: the hue competes with the artwork. Those get
      // a neutral plate and keep the tint for the title alone.
      const selfColoured = glyph.paths.some(
        (shape) =>
          typeof shape.fill === 'string' && shape.fill !== 'none' && shape.fill !== 'currentColor',
      );
      return h(
        'span',
        {
          key,
          className:
            'dsh-svc-badge' +
            (runtime === undefined ? ' is-generic' : '') +
            (selfColoured ? ' is-brand' : ''),
          style: { '--dsh-svc-tint': runtime?.tint ?? 'var(--dsw-alias-label-secondary)' },
          title: runtime?.label ?? 'run',
        },
        h(
          'svg',
          { viewBox: glyph.viewBox, fill: 'currentColor', 'aria-hidden': true },
          glyph.paths.map((shape, index) =>
            h('path', {
              key: index,
              d: shape.d,
              fill: shape.fill,
              stroke: shape.stroke,
              strokeWidth: shape.stroke === undefined ? undefined : 1,
            }),
          ),
        ),
      );
    }

    /**
     * Scripts are ordered by the tool that runs them first — package managers,
     * then node, go, the JVM tools, python, docker, .NET — so an `npm run` entry
     * never sits in the middle of a run of `node` ones. Inside one tool, they are
     * ordered by what they do (dev, build, test, check, report), then by name.
     */
    const TOOL_ORDER = ['npm', 'node', 'go', 'maven', 'gradle', 'java', 'python', 'docker', 'dotnet'];

    function toolRank(script) {
      const runtime = runtimeOf(script);
      if (runtime === undefined) return TOOL_ORDER.length;
      const index = TOOL_ORDER.indexOf(runtime.icon);
      return index === -1 ? TOOL_ORDER.length : index;
    }

    const SCRIPT_CATEGORIES = [
      [/^(dev|start|serve|watch|run)\b/i, 0],
      [/^(build|compile|bundle|package|dist|release)\b/i, 1],
      [/^(test|e2e|spec|coverage)\b/i, 2],
      [/^(lint|check|typecheck|format|fmt|validate|verify)\b/i, 3],
      [/^(size|report|audit|scan|analy|stats)\b/i, 4],
    ];

    function scriptRank(script) {
      const name = String(script?.name ?? '');
      for (const [pattern, rank] of SCRIPT_CATEGORIES) {
        if (pattern.test(name)) return rank;
      }
      return 9;
    }

    function sortScripts(scripts) {
      return [...scripts].sort((left, right) => {
        const tool = toolRank(left) - toolRank(right);
        if (tool !== 0) return tool;
        const rank = scriptRank(left) - scriptRank(right);
        if (rank !== 0) return rank;
        return String(left.name ?? '').localeCompare(String(right.name ?? ''));
      });
    }

    /** Case-insensitive filter over both the script name and its command. */
    function filterGroups(groups, query) {
      const needle = query.trim().toLowerCase();
      if (needle === '') return groups;
      const matched = [];
      for (const group of groups) {
        const scripts = group.scripts.filter(
          (script) =>
            String(script.name ?? '').toLowerCase().includes(needle) ||
            String(script.command ?? '').toLowerCase().includes(needle),
        );
        if (scripts.length > 0) matched.push({ ...group, scripts });
      }
      return matched;
    }



      return { RUNTIMES, BRAND_ICONS, GENERIC_ICON, detectRuntime, runtimeOf, RuntimeBadge, sortScripts, filterGroups, toolRank, scriptRank };
    }

    return { createData };
  },
});