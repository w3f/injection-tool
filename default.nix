with import <nixpkgs> {}; {
    nodeEnv = stdenv.mkDerivation {
        name = "node";
        buildInputs = [
            yarn
            nodejs-10_x
            nodePackages_10_x.node-gyp 
            nodePackages_10_x.node-gyp-build
            nodePackages_10_x.node-pre-gyp
        ];
    };
}
