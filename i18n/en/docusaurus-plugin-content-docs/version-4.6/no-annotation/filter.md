# Switching Datasource with a Filter

Goal: intercept every request whose path starts with `filter/**`; if the following part starts with `a` switch to `db1`, if it starts with `b` switch to `db2`, otherwise use the default datasource.

Implementation:

```java
@Slf4j
@WebFilter(filterName = "dsFilter", urlPatterns = {"/filter/*"})
public class DynamicDatasourceFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        log.info("loading filter {}", filterConfig.getFilterName());
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String requestURI = request.getRequestURI();
        log.info("passing through the multi-datasource filter, current path is {}", requestURI);
//        String headerDs = request.getHeader("ds");
//        Object sessionDs = request.getSession().getAttribute("ds");
        String s = requestURI.replaceFirst("/filter/", "");

        String dsKey = "master";
        if (s.startsWith("a")) {
            dsKey = "db1";
        } else if (s.startsWith("b")) {
            dsKey = "db2";
        } else {

        }

        // execute
        try {
            DynamicDataSourceContextHolder.push(dsKey);
            filterChain.doFilter(servletRequest, servletResponse);
        } finally {
            DynamicDataSourceContextHolder.poll();
        }
    }

    @Override
    public void destroy() {

    }
}
```
```java
@SpringBootApplication
@ServletComponentScan // required for filters
@MapperScan("com.baomidou.samples.ds.mapper")
public class AllDataSourceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AllDataSourceApplication.class, args);
    }
}
```
Sample project (the original `all-datasource-sample` was reorganized along with the samples repository; the complete code above is self-contained): https://github.com/dynamic-datasource/dynamic-datasource-samples

Going further: a request carries much more than its path, for instance headers and session attributes. Could you set and switch the datasource dynamically from a header value, or from the user stored in the session, in exactly the same way?
