# Filter 切换数据源

目标：拦截以filter/**开头的所有请求，如果后面的方法以a开头就切换到db1，以b开头就切换到db2，其余使用默认数据源。

实现如下：
~~~
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
        log.info("经过多数据源filter,当前路径是{}", requestURI);
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

        //执行
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
~~~
~~~
@SpringBootApplication
@ServletComponentScan //filter必须使用这个
@MapperScan("com.baomidou.samples.ds.mapper")
public class AllDataSourceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AllDataSourceApplication.class, args);
    }
}
~~~
对应源码： https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/all-datasource-sample
扩展：从request中还能获取到很多东西，如header和session，是否同理可以根据自己业务需求根据header值和session里对应的用户来动态设置和切换数据源？

