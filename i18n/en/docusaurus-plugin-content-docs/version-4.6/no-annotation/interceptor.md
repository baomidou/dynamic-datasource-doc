# Switching Datasource with an Interceptor

Goal: intercept every request whose path starts with `filter/**`; if the following part starts with `a` switch to `db1`, if it starts with `b` switch to `db2`, otherwise use the default datasource.

Implementation:

```java
import com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Slf4j
public class DynamicDatasourceInterceptor implements HandlerInterceptor {

    /**
     * Called before the request is handled (before the Controller method)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String requestURI = request.getRequestURI();
        log.info("passing through the multi-datasource interceptor, current path is {}", requestURI);
//        String headerDs = request.getHeader("ds");
//        Object sessionDs = request.getSession().getAttribute("ds");
        String s = requestURI.replaceFirst("/interceptor/", "");

        String dsKey = "master";
        if (s.startsWith("a")) {
            dsKey = "db1";
        } else if (s.startsWith("b")) {
            dsKey = "db2";
        } else {

        }

        DynamicDataSourceContextHolder.push(dsKey);
        return true;
    }

    /**
     * Called after the request is handled, but before the view is rendered (after the Controller method)
     */
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {

    }

    /**
     * Called after the whole request has completed, i.e. after the DispatcherServlet rendered the view (mainly for resource cleanup)
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        DynamicDataSourceContextHolder.clear();
    }

}
```

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MyWebAutoConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new DynamicDatasourceInterceptor()).addPathPatterns("/interceptor/**");
    }
}

```
Sample project (the original `all-datasource-sample` was reorganized along with the samples repository; the complete code above is self-contained): https://github.com/dynamic-datasource/dynamic-datasource-samples

Going further: a request carries much more than its path, for instance headers and session attributes. Could you set and switch the datasource dynamically from a header value, or from the user stored in the session, in exactly the same way?
