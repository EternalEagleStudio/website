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

/**
 * 基于 JavaParser 构建方法调用图
 * 用法: java -cp javaparser-core-3.28.2.jar:. BuildMethodCallGraph <源码根目录> [--dot]
 * --dot 生成 Graphviz DOT 格式（优化布局，解决节点 margin 触碰警告）
 */
public class BuildMethodCallGraph {

    // 调用图：调用方完整标识 -> 去重的被调用方完整标识列表
    private static final Map<String, Set<String>> callGraph = new HashMap<>();

    // 全局方法注册表：方法名 -> 定义该方法的类名集合（用于跨文件解析）
    private static final Map<String, Set<String>> methodRegistry = new HashMap<>();

    // 存储所有类名（简单名，不含包）
    private static final Set<String> allClasses = new HashSet<>();

    // 是否输出 DOT 格式
    private static boolean outputAsDot = false;

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            System.err.println("用法: java BuildMethodCallGraph <源码根目录> [--dot]");
            System.err.println("  --dot  生成 Graphviz DOT 格式（布局优化，防止节点遮挡）");
            System.exit(1);
        }

        String rootPath = args[0];
        if (args.length > 1 && "--dot".equals(args[1])) {
            outputAsDot = true;
        }

        File root = new File(rootPath);
        if (!root.exists() || !root.isDirectory()) {
            System.err.println("错误: 路径不存在或不是目录");
            System.exit(1);
        }

        // 第一遍扫描：建立方法注册表（方法名 -> 定义类）
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
            System.out.println("使用以下命令生成 SVG（布局优化，节点边距宽松，无 margin 警告）:");
            System.out.println("  sfdp -Tsvg callgraph.dot -Goverlap=scale -Gsplines=true -o callgraph.svg");
            System.out.println("或使用 neato 布局: neato -Tsvg callgraph.dot -Goverlap=scale -Gsplines=true -o callgraph.svg");
        } else {
            printPlainText();
        }
    }

    // ==================== 第一遍扫描：注册所有方法 ====================

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
            System.err.println("注册阶段解析失败: " + javaFile.getPath() + " - " + e.getMessage());
        }
    }

    // ==================== 第二遍扫描：构建调用关系 ====================

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
                // 获取本类定义的所有方法名（用于优先匹配当前类）
                Set<String> localMethods = clazz.getMethods().stream()
                        .map(MethodDeclaration::getNameAsString)
                        .collect(Collectors.toSet());

                for (MethodDeclaration method : clazz.getMethods()) {
                    String methodName = method.getNameAsString();
                    String callerKey = className + "." + methodName;

                    // 收集该方法的被调用方（去重，使用 Set）
                    Set<String> callees = new HashSet<>();

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
                        callGraph.computeIfAbsent(callerKey, k -> new HashSet<>()).addAll(callees);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("调用图解析失败: " + javaFile.getPath() + " - " + e.getMessage());
        }
    }

    /**
     * 解析被调用方法对应的最佳匹配类名
     * @param methodName   被调用方法名
     * @param currentClass 当前类名
     * @param localMethods 当前类定义的方法名集合
     * @return 最可能的类名（可能带 '?' 标记歧义）
     */
    private static String resolveCalleeClass(String methodName, String currentClass, Set<String> localMethods) {
        // 1. 优先匹配当前类自己定义的方法
        if (localMethods.contains(methodName)) {
            return currentClass;
        }

        // 2. 从全局注册表中查找包含该方法的类
        Set<String> candidates = methodRegistry.getOrDefault(methodName, Collections.emptySet());
        if (candidates.isEmpty()) {
            return "UnknownClass";
        }
        if (candidates.size() == 1) {
            return candidates.iterator().next();
        }

        // 3. 多个候选类：尝试选择与当前类同包或继承的类（这里简化处理，加警告）
        String first = candidates.iterator().next();
        System.err.println("警告: 方法 '" + methodName + "' 在多个类中定义 (" + candidates +
                ")，使用第一个候选类 " + first + " 作为目标，调用链可能不精确。");
        return first + "?";
    }

    // ==================== 输出 ====================

    private static void printPlainText() {
        System.out.println("========== 方法调用关系（邻接列表） ==========");
        for (Map.Entry<String, Set<String>> entry : callGraph.entrySet()) {
            String caller = entry.getKey();
            for (String callee : entry.getValue()) {
                System.out.println(caller + " -> " + callee);
            }
        }
        System.out.println("========================================================");
        int totalEdges = callGraph.values().stream().mapToInt(Set::size).sum();
        System.out.println("总调用关系数: " + totalEdges);
    }

    private static void exportDot(String filename) throws IOException {
        try (PrintWriter out = new PrintWriter(new FileWriter(filename))) {
            out.println("digraph MethodCallGraph {");
            // ========== 全局布局优化参数（增大边距，防止 margin 触碰警告） ==========
            out.println("  rankdir=TB;                // 从上到下布局");
            out.println("  overlap=scale;             // 使用 scale 模式，比 overlap=false 更宽松");
            out.println("  splines=true;              // 允许曲线/折线，让布局更自然");
            out.println("  nodesep=1.2;               // 同层节点最小距离（大幅增加）");
            out.println("  ranksep=1.0;               // 不同层级间距（大幅增加）");
            out.println("  sep=0.8;                   // 全局节点边距（Graphviz 1.0+）");
            out.println("  margin=0.5;                // 画布内边距");
            out.println("  fontname=\"Helvetica\";");
            out.println("  node [shape=box, style=filled, fillcolor=lightblue, margin=\"0.15,0.08\", fontname=\"Helvetica\", fontsize=10];");
            out.println("  edge [arrowsize=0.7, fontname=\"Helvetica\", fontsize=8, penwidth=1.2];");
            out.println();

            // 记录已输出节点，避免重复定义
            Set<String> definedNodes = new HashSet<>();

            for (Map.Entry<String, Set<String>> entry : callGraph.entrySet()) {
                String caller = entry.getKey();
                String callerLabel = formatNodeLabel(caller);
                if (!definedNodes.contains(caller)) {
                    out.printf("  \"%s\" [label=\"%s\"];\n", escape(caller), callerLabel);
                    definedNodes.add(caller);
                }

                for (String callee : entry.getValue()) {
                    String calleeLabel = formatNodeLabel(callee);
                    if (!definedNodes.contains(callee)) {
                        out.printf("  \"%s\" [label=\"%s\"];\n", escape(callee), calleeLabel);
                        definedNodes.add(callee);
                    }
                    out.printf("  \"%s\" -> \"%s\";\n", escape(caller), escape(callee));
                }
            }
            out.println("}");
        }
    }

    /**
     * 将 "ClassName.methodName" 格式化为 "ClassName\nmethodName"
     * 处理歧义标记 '?'，并限制标签长度
     */
    private static String formatNodeLabel(String qualifiedMethod) {
        int dotIdx = qualifiedMethod.lastIndexOf('.');
        if (dotIdx <= 0) {
            return qualifiedMethod;
        }
        String className = qualifiedMethod.substring(0, dotIdx);
        String methodName = qualifiedMethod.substring(dotIdx + 1);
        if (className.endsWith("?")) {
            className = className.substring(0, className.length() - 1) + " (歧义)";
        }
        // 限制标签长度，避免节点过宽
        if (className.length() > 28) {
            className = className.substring(0, 25) + "...";
        }
        if (methodName.length() > 28) {
            methodName = methodName.substring(0, 25) + "...";
        }
        return className + "\\n" + methodName;
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
