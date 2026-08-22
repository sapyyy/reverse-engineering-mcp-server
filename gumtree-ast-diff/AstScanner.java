import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtVariable;
import spoon.reflect.visitor.filter.TypeFilter;
import gumtree.spoon.builder.SpoonGumTreeBuilder;
import com.github.gumtreediff.tree.Tree;
import com.github.gumtreediff.tree.TreeUtils;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.File;
import java.util.*;
import java.util.regex.Pattern;

public class AstScanner {

    private static final Set<String> CONVENTIONAL_SINGLE_LETTERS = new HashSet<>(Arrays.asList(
            "i", "j", "k", "n", "e", "t", "s", "c", "b", "p", "m", "r", "w", "v", "x", "y", "z",
            "T", "E", "K", "V", "R", "S", "U", "A", "B", "C", "N", "X"
    ));

    private static class ObfuscationPattern {
        Pattern regex;
        String type;
        String description;

        ObfuscationPattern(String regex, String type, String description) {
            this.regex = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            this.type = type;
            this.description = description;
        }
    }

    private static final List<ObfuscationPattern> OBFUSCATED_PATTERNS = Arrays.asList(
            new ObfuscationPattern("^(var|lv|lvt)\\d+$", "numbered-synthetic", "Numbered synthetic variable"),
            new ObfuscationPattern("^arg\\d+$", "numbered-arg", "Numbered argument placeholder"),
            new ObfuscationPattern("^val\\$.+$", "closure-capture", "Closure captured variable"),
            new ObfuscationPattern("^this\\$\\d+$", "inner-class-ref", "Inner class outer reference"),
            new ObfuscationPattern("^access\\$\\d+$", "synthetic-accessor", "Synthetic accessor method"),
            new ObfuscationPattern("^lambda\\$$", "lambda-synthetic", "Lambda synthetic method"),
            new ObfuscationPattern("^[a-z]$", "single-letter", "Single letter variable")
    );

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: AstScanner <source-dir>");
            System.exit(1);
        }
        String sourceDir = args[0];

        try {
            Launcher launcher = new Launcher();
            launcher.addInputResource(sourceDir);
            launcher.getEnvironment().setNoClasspath(true);
            launcher.buildModel();
            CtModel model = launcher.getModel();

            SpoonGumTreeBuilder builder = new SpoonGumTreeBuilder();
            Tree gumtree = builder.getTree(launcher.getFactory().Package().getRootPackage());
            
            int totalGumTreeNodes = 0;
            for (Tree node : TreeUtils.preOrder(gumtree)) {
                totalGumTreeNodes++;
            }

            List<Map<String, Object>> detectedObfuscations = new ArrayList<>();
            int totalVariablesScanned = 0;

            for (CtVariable<?> var : model.getElements(new TypeFilter<>(CtVariable.class))) {
                String varName = var.getSimpleName();
                totalVariablesScanned++;

                if (CONVENTIONAL_SINGLE_LETTERS.contains(varName)) continue;

                for (ObfuscationPattern obfPattern : OBFUSCATED_PATTERNS) {
                    if (obfPattern.type.equals("single-letter") && CONVENTIONAL_SINGLE_LETTERS.contains(varName)) continue;
                    
                    if (obfPattern.regex.matcher(varName).matches()) {
                        Map<String, Object> detection = new HashMap<>();
                        
                        String file = "unknown";
                        int line = -1;
                        if (var.getPosition().isValidPosition()) {
                            File f = var.getPosition().getFile();
                            if (f != null) {
                                file = new File(sourceDir).toURI().relativize(f.toURI()).getPath();
                            }
                            line = var.getPosition().getLine();
                        }
                        
                        detection.put("file", file);
                        detection.put("line", line);
                        detection.put("variableName", varName);
                        detection.put("type", obfPattern.type);
                        detection.put("description", obfPattern.description);
                        detection.put("lineContent", var.toString());
                        
                        detectedObfuscations.add(detection);
                        break;
                    }
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("totalVariablesScanned", totalVariablesScanned);
            result.put("totalGumTreeNodes", totalGumTreeNodes);
            result.put("detectedObfuscations", detectedObfuscations);

            Gson gson = new GsonBuilder().setPrettyPrinting().create();
            System.out.println("===GUMTREE_AST_JSON_START===");
            System.out.println(gson.toJson(result));
            System.out.println("===GUMTREE_AST_JSON_END===");

        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
