import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.*;
import java.util.stream.Collectors;

public class BuildMethodCallGraph {
    // 存储调用关系：调用方完整标识 -> 被调用方完整标识列表
    private static Map<String, List<String>> callGraph = new HashMap<>();
    private static boolean outputAsDot = false;

    // 全局方法注册表：方法名 -> 包含该方法的类名集合（用于跨文件解析）
    private static Map<String, Set<String>> methodRegistry = new HashMap<>();

    // 存储每个类的完整名称（含包名，简化处理只取类名，如需完整包名可扩展）
    private static Set<String> allClasses = new HashSet<>();

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            System.out.println("用法: java BuildMethodCallGraph <源码根目录> [--dot]");
            System.out.println("  --dot  生成 Graphviz DOT 格式（优化布局，防止节点遮挡）");
            return;
        }

        String rootPath = args[0];
        if (args.length > 1 && "--dot".equals(args[1])) {
            outputAsDot = true;
        }

        File root = new File(rootPath);
        if (!root.exists() || !root.isDirectory()) {
            System.err.println("错误: 路径不存在或不是目录");
            return;
        }

        // 第一遍扫描：建立方法注册表
        System.out.println("第一遍扫描：收集所有类及方法签名...");
        scanDirectoryForRegistry(root);
        System.out.println("发现 " + allClasses.size() + " 个类，方法注册表包含 " + methodRegistry.size() + " 个方法名");

        // 第二遍扫描：构建精确调用图
        System.out.println("第二遍扫描：构建方法调用图...");
        scanDirectoryForCallGraph(root);

        // 输出结果
        if (outputAsDot) {
            exportDot("callgraph.dot");
            System.out.println("DOT 文件已生成: callgraph.dot");
            System.out.println("使用以下命令生成 SVG（布局优化后节点不再重叠）:");
            System.out.println("  sfdp -Tsvg callgraph.dot -o callgraph.svg");
            System.out.println("或使用 fdp / dot 配合 -Goverlap=false 参数");
        } else {
            printPlainText();
        }
    }

    // 第一遍扫描：记录每个类中定义的方法
    private static void scanDirectoryForRegistry(File dir) {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isDirectory()) {
                scanDirectoryForRegistry(file);
            } else if (file.getName().endsWith(".java")) {
                registerMethodsFromFile(file);
            }
        }
    }

    private static void registerMethodsFromFile(File javaFile) {
        try {
            CompilationUnit cu = StaticJavaParser.parse(javaFile);
            for (ClassOrInterfaceDeclaration clazz : cu.findAll(ClassOrInterfaceDeclaration.class)) {
                String className = clazz.getNameAsString();
                allClasses.add(className);
                for (MethodDeclaration method : clazz.getMethods()) {
                    String methodName = method.getNameAsString();
                    methodRegistry.computeIfAbsent(methodName, k -> new HashSet<>()).add(className);
                }
            }
        } catch (Exception e) {
            // 忽略解析错误的文件
            System.err.println("注册阶段解析失败: " + javaFile.getPath() + " - " + e.getMessage());
        }
    }

    // 第二遍扫描：构建调用关系（使用注册表解析被调用方的类名）
    private static void scanDirectoryForCallGraph(File dir) {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isDirectory()) {
                scanDirectoryForCallGraph(file);
            } else if (file.getName().endsWith(".java")) {
                parseJavaFileForCallGraph(file);
            }
        }
    }

    private static void parseJavaFileForCallGraph(File javaFile) {
        try {
            CompilationUnit cu = StaticJavaParser.parse(javaFile);
            for (ClassOrInterfaceDeclaration clazz : cu.findAll(ClassOrInterfaceDeclaration.class)) {
                String className = clazz.getNameAsString();
                // 获取本类定义的所有方法名，用于优先匹配本类调用
                Set<String> localMethods = clazz.getMethods().stream()
                        .map(MethodDeclaration::getNameAsString)
                        .collect(Collectors.toSet());

                for (MethodDeclaration method : clazz.getMethods()) {
                    String methodName = method.getNameAsString();
                    String callerKey = className + "." + methodName;
                    List<String> callees = new ArrayList<>();

                    method.accept(new VoidVisitorAdapter<Void>() {
                        @Override
                        public void visit(MethodCallExpr n, Void arg) {
                            super.visit(n, arg);
                            String calleeName = n.getNameAsString();

                            // 解析被调用方法最可能的类名
                            String resolvedClass = resolveCalleeClass(calleeName, className, localMethods);
                            String calleeKey = resolvedClass + "." + calleeName;
                            callees.add(calleeKey);
                        }
                    }, null);

                    if (!callees.isEmpty()) {
                        callGraph.computeIfAbsent(callerKey, k -> new ArrayList<>()).addAll(callees);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("调用图解析失败: " + javaFile.getPath() + " - " + e.getMessage());
        }
    }

    // 解析被调用方法对应的最佳匹配类名
    private static String resolveCalleeClass(String methodName, String currentClass, Set<String> localMethods) {
        // 1. 优先匹配当前类自己定义的方法
        if (localMethods.contains(methodName)) {
            return currentClass;
        }

        // 2. 从全局注册表中查找包含该方法的类
        Set<String> candidates = methodRegistry.getOrDefault(methodName, Collections.emptySet());
        if (candidates.isEmpty()) {
            // 未找到任何定义，标记为未知（但保留方法名，避免空节点）
            return "UnknownClass";
        }
        if (candidates.size() == 1) {
            // 只有一个类包含此方法，直接使用
            return candidates.iterator().next();
        }
        // 3. 多个候选类时：检查父类/接口等更复杂的逻辑较耗时，这里简单返回第一个并添加警告标识
        // 也可以将当前类所在包作为优先（需要包信息，本示例简化）
        String first = candidates.iterator().next();
        System.err.println("警告: 方法 '" + methodName + "' 在多个类中定义 (" + candidates +
                ")，使用第一个候选类 " + first + " 作为目标，调用链可能不精确。");
        return first + "?";
    }

    private static void printPlainText() {
        System.out.println("========== 方法调用关系（邻接列表，完整限定名） ==========");
        for (Map.Entry<String, List<String>> entry : callGraph.entrySet()) {
            String caller = entry.getKey();
            for (String callee : entry.getValue()) {
                System.out.println(caller + " -> " + callee);
            }
        }
        System.out.println("========================================================");
        System.out.println("总调用关系数: " + callGraph.values().stream().mapToInt(List::size).sum());
    }

    private static void exportDot(String filename) throws IOException {
        try (PrintWriter out = new PrintWriter(new FileWriter(filename))) {
            out.println("digraph MethodCallGraph {");
            // ===== 全局布局优化参数，防止节点重叠和遮挡 =====
            out.println("  rankdir=TB;                // 从上到下布局，更适合方法调用层级");
            out.println("  overlap=false;             // 禁止节点重叠");
            out.println("  splines=ortho;             // 使用正交连线，减少交叉");
            out.println("  nodesep=0.5;               // 同一层级节点间最小距离");
            out.println("  ranksep=0.3;               // 不同层级间距");
            out.println("  fontname=\"Helvetica\";");
            out.println("  node [shape=box, style=filled, fillcolor=lightblue, fontname=\"Helvetica\", fontsize=10, margin=\"0.2,0.1\"];");
            out.println("  edge [arrowsize=0.7, fontname=\"Helvetica\", fontsize=8];");
            out.println();

            // 输出所有边，节点ID已经使用完整限定名，无需额外定义节点
            for (Map.Entry<String, List<String>> entry : callGraph.entrySet()) {
                String caller = entry.getKey();
                for (String callee : entry.getValue()) {
                    // 节点label 格式：类名\n方法名 或 未知类\n方法名，便于阅读
                    String callerLabel = formatNodeLabel(caller);
                    String calleeLabel = formatNodeLabel(callee);
                    out.printf("  \"%s\" [label=\"%s\"];\n", escape(caller), callerLabel);
                    out.printf("  \"%s\" [label=\"%s\"];\n", escape(callee), calleeLabel);
                    out.printf("  \"%s\" -> \"%s\";\n", escape(caller), escape(callee));
                }
            }
            out.println("}");
        }
    }

    // 将 "ClassName.methodName" 格式化为 "ClassName\nmethodName" 或 "UnknownClass\nmethodName"
    private static String formatNodeLabel(String qualifiedMethod) {
        int dotIdx = qualifiedMethod.lastIndexOf('.');
        if (dotIdx <= 0) {
            return qualifiedMethod;
        }
        String className = qualifiedMethod.substring(0, dotIdx);
        String methodName = qualifiedMethod.substring(dotIdx + 1);
        // 去掉可能附加的歧义标记 ?
        if (className.endsWith("?")) {
            className = className.substring(0, className.length() - 1) + " (可能歧义)";
        }
        return className + "\\n" + methodName;
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
